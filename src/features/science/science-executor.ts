/**
 * Science Executor - Python subprocess management
 *
 * Manages Python process execution with session persistence via pickle.
 * Follows the pattern established in tdd-manager.ts for child_process execution.
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  ScienceSession,
  ExecutionLimits,
  ScienceTimeoutError,
  ScienceError,
  DEFAULT_SCIENCE_CONFIG,
} from './science-types.js';
import { ScienceStore } from './science-store.js';

const execAsync = promisify(exec);

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  returnValues?: Record<string, any>;
  variables: Record<string, string>; // variable name -> type
  executionTime: number;
  error?: string;
}

/**
 * Dangerous patterns that could lead to code injection or unsafe behavior
 */
const DANGEROUS_PATTERNS = [
  /__import__\s*\(/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
  /compile\s*\(/i,
  /os\.system\s*\(/i,
  /subprocess\.(run|call|Popen|check_output|check_call)\s*\(/i,
  /globals\s*\(\s*\)\s*\[/i,
  /locals\s*\(\s*\)\s*\[/i,
  /\bexecfile\b/i,
  /\binput\s*\(/i, // Can be dangerous in automated contexts
];

export class ScienceExecutor {
  private store: ScienceStore;
  private venvPath: string;
  private pythonPath: string;
  private limits: ExecutionLimits;
  private sessionDir: string;

  constructor(
    store: ScienceStore,
    venvPath: string = DEFAULT_SCIENCE_CONFIG.venvPath,
    limits: ExecutionLimits = DEFAULT_SCIENCE_CONFIG.limits
  ) {
    this.store = store;
    this.venvPath = venvPath;
    this.pythonPath = this.getPythonPath();
    this.limits = limits;
    this.sessionDir = join(venvPath, '.sessions');

    // Create session directory if it doesn't exist
    if (!existsSync(this.sessionDir)) {
      mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Get the Python executable path from venv
   */
  private getPythonPath(): string {
    const isWindows = process.platform === 'win32';
    const binDir = isWindows ? 'Scripts' : 'bin';
    const pythonExe = isWindows ? 'python.exe' : 'python';
    return join(this.venvPath, binDir, pythonExe);
  }

  /**
   * Validate user code for dangerous patterns
   */
  private validateCode(code: string): void {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        throw new ScienceError(
          `Code contains potentially dangerous pattern: ${pattern.source}`,
          'VALIDATION_ERROR'
        );
      }
    }
  }

  /**
   * Execute Python code with optional session persistence
   */
  async executePython(
    code: string,
    sessionId?: string,
    options: {
      captureOutput?: boolean;
      returnVars?: string[];
      timeout?: number;
    } = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.limits.timeoutMs;

    // Track temp files for cleanup
    let scriptPath: string | undefined;
    let codeFilePath: string | undefined;
    let outputPath: string | undefined;

    try {
      // Validate code for dangerous patterns
      this.validateCode(code);

      // Prepare execution environment
      const execId = randomUUID();
      scriptPath = join(this.sessionDir, `exec_${execId}.py`);
      codeFilePath = join(this.sessionDir, `code_${execId}.py`);
      outputPath = join(this.sessionDir, `output_${execId}.json`);

      // Load session if provided
      let session: ScienceSession | undefined;
      let pickleFile: string | undefined;

      if (sessionId) {
        session = this.store.getSession(sessionId);
        if (!session) {
          throw new ScienceError(
            `Session not found: ${sessionId}`,
            'SESSION_NOT_FOUND'
          );
        }
        pickleFile = join(this.sessionDir, `session_${sessionId}.pkl`);
      }

      // Write user code to separate file (secure approach)
      try {
        writeFileSync(codeFilePath, code, 'utf-8');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ScienceError(
          `Failed to write code file: ${message}`,
          'FILE_WRITE_ERROR'
        );
      }

      // Generate Python script with session restoration and capture logic
      const pythonScript = this.generateExecutionScript(
        codeFilePath,
        pickleFile,
        outputPath,
        options.returnVars || [],
        options.captureOutput !== false
      );

      try {
        writeFileSync(scriptPath, pythonScript, 'utf-8');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new ScienceError(
          `Failed to write execution script: ${message}`,
          'FILE_WRITE_ERROR'
        );
      }

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(scriptPath, timeout);

        // Parse output
        let outputData: Record<string, unknown> = {};
        if (existsSync(outputPath)) {
          try {
            const outputContent = readFileSync(outputPath, 'utf-8');
            outputData = JSON.parse(outputContent);
          } catch (err) {
            // Ignore parse errors
          }
        }

        // Update session if provided
        if (sessionId && session) {
          this.store.incrementExecutionCount(sessionId);

          // Update history (keep limited)
          const history = [...session.history, code];
          if (history.length > this.limits.maxHistorySize) {
            history.shift();
          }

          this.store.updateSession(sessionId, {
            history,
            variables: (outputData.variables as Record<string, string>) || session.variables,
          });
        }

        const executionTime = Date.now() - startTime;

        return {
          success: result.success,
          stdout: result.stdout,
          stderr: result.stderr,
          returnValues: outputData.return_values as Record<string, any> | undefined,
          variables: (outputData.variables as Record<string, string>) || {},
          executionTime,
          error: result.error,
        };
      } finally {
        // CRITICAL: Always cleanup temp files, even on errors or timeouts
        this.cleanupTempFile(outputPath);
        this.cleanupTempFile(scriptPath);
        this.cleanupTempFile(codeFilePath);
      }
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      // Cleanup temp files on validation/setup errors
      if (outputPath) this.cleanupTempFile(outputPath);
      if (scriptPath) this.cleanupTempFile(scriptPath);
      if (codeFilePath) this.cleanupTempFile(codeFilePath);

      if (error instanceof ScienceTimeoutError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        stdout: '',
        stderr: '',
        variables: {},
        executionTime,
        error: message,
      };
    }
  }

  /**
   * Safely cleanup a single temp file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch (err) {
      // Silently ignore cleanup errors to avoid masking original errors
      // Log could be added here if logging system is available
    }
  }

  /**
   * Generate Python script for execution with session management
   * Now reads code from file instead of embedding inline
   * Includes proper file handle cleanup and resource management
   */
  private generateExecutionScript(
    codeFilePath: string,
    pickleFile: string | undefined,
    outputPath: string,
    returnVars: string[],
    captureOutput: boolean
  ): string {
    return `
import sys
import json
import pickle
import io
import traceback
import gc
from contextlib import redirect_stdout, redirect_stderr

# Restore session if pickle file exists
globals_dict = {}
if ${pickleFile ? `'${pickleFile}'` : 'None'} and __import__('os').path.exists(${pickleFile ? `'${pickleFile}'` : 'None'}):
    pickle_file = None
    try:
        pickle_file = open(${pickleFile ? `'${pickleFile}'` : 'None'}, 'rb')
        globals_dict = pickle.load(pickle_file)
    except Exception as e:
        print(f"Warning: Could not restore session: {e}", file=sys.stderr)
    finally:
        if pickle_file:
            pickle_file.close()

# Setup output capture
output_data = {
    'return_values': {},
    'variables': {},
    'error': None
}

${captureOutput ? `
stdout_capture = io.StringIO()
stderr_capture = io.StringIO()
` : ''}

code_file = None
try:
    # Read and execute code from file (secure approach - no string escaping)
    code_file = open('${codeFilePath.replace(/\\/g, '\\\\')}', 'r', encoding='utf-8')
    user_code = code_file.read()
    code_file.close()
    code_file = None

    ${captureOutput ? `
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        exec(user_code, globals_dict)
    ` : `
    exec(user_code, globals_dict)
    `}

    # Capture return values if specified
    ${returnVars.length > 0 ? `
    return_vars = ${JSON.stringify(returnVars)}
    for var_name in return_vars:
        if var_name in globals_dict:
            try:
                # Try to serialize the value
                value = globals_dict[var_name]
                if isinstance(value, (str, int, float, bool, list, dict, type(None))):
                    output_data['return_values'][var_name] = value
                else:
                    output_data['return_values'][var_name] = str(value)
            except:
                output_data['return_values'][var_name] = '<unserializable>'
    ` : ''}

    # Capture all variables and their types
    for key, value in globals_dict.items():
        if not key.startswith('_'):
            output_data['variables'][key] = type(value).__name__

    # Save session state
    ${pickleFile ? `
    session_file = None
    try:
        session_file = open('${pickleFile}', 'wb')
        pickle.dump(globals_dict, session_file)
    except Exception as e:
        print(f"Warning: Could not save session: {e}", file=sys.stderr)
    finally:
        if session_file:
            session_file.close()
    ` : ''}

except Exception as e:
    output_data['error'] = str(e)
    traceback.print_exc()
finally:
    # Ensure code file is closed if still open
    if code_file:
        code_file.close()

    # Close any matplotlib figures to free resources
    try:
        import matplotlib.pyplot as plt
        plt.close('all')
    except:
        pass

    # Force garbage collection to release file handles
    gc.collect()

# Write output data
output_file = None
try:
    output_file = open('${outputPath}', 'w')
    json.dump(output_data, output_file)
except Exception as e:
    print(f"Error writing output: {e}", file=sys.stderr)
finally:
    if output_file:
        output_file.close()

${captureOutput ? `
# Print captured output
print(stdout_capture.getvalue(), end='')
if stderr_capture.getvalue():
    print(stderr_capture.getvalue(), end='', file=sys.stderr)

# Clean up IO captures
try:
    stdout_capture.close()
    stderr_capture.close()
except:
    pass
` : ''}
`;
  }

  /**
   * Execute Python script with timeout
   * Ensures all file descriptors and streams are properly closed
   */
  private async executeWithTimeout(
    scriptPath: string,
    timeoutMs: number
  ): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
    return new Promise((resolve) => {
      const child: ChildProcess = spawn(this.pythonPath, [scriptPath]);

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolved = false;

      /**
       * Cleanup function to close all streams and prevent resource leaks
       */
      const cleanup = () => {
        if (child.stdout) {
          child.stdout.removeAllListeners();
          child.stdout.destroy();
        }
        if (child.stderr) {
          child.stderr.removeAllListeners();
          child.stderr.destroy();
        }
        if (child.stdin) {
          child.stdin.removeAllListeners();
          child.stdin.destroy();
        }
        child.removeAllListeners();
      };

      /**
       * Resolve promise only once and cleanup resources
       */
      const resolveOnce = (result: { success: boolean; stdout: string; stderr: string; error?: string }) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };

      // Set up timeout
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        // Force kill if still running after grace period
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeoutMs);

      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        if (stdout.length > this.limits.maxOutputSize) {
          child.kill('SIGTERM');
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (stderr.length > this.limits.maxOutputSize) {
          child.kill('SIGTERM');
        }
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);

        if (timedOut) {
          resolveOnce({
            success: false,
            stdout,
            stderr,
            error: `Execution timed out after ${timeoutMs}ms`,
          });
        } else if (code === 0) {
          resolveOnce({
            success: true,
            stdout,
            stderr,
          });
        } else {
          resolveOnce({
            success: false,
            stdout,
            stderr,
            error: `Process exited with code ${code}`,
          });
        }
      });

      child.on('error', (error: Error) => {
        clearTimeout(timer);
        resolveOnce({
          success: false,
          stdout,
          stderr,
          error: error.message,
        });
      });
    });
  }

  /**
   * Check if Python environment is available
   */
  async checkEnvironment(): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    if (!existsSync(this.pythonPath)) {
      return {
        available: false,
        error: `Python executable not found at ${this.pythonPath}`,
      };
    }

    try {
      const { stdout, stderr } = await execAsync(
        `"${this.pythonPath}" --version`
      );
      const version = (stdout + stderr).trim();
      return {
        available: true,
        version,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        available: false,
        error: message,
      };
    }
  }

  /**
   * Clean up session files - removes pickle file and associated temp files
   * Should be called when a session is destroyed
   */
  cleanupSession(sessionId: string): void {
    // Remove pickle file
    const pickleFile = join(this.sessionDir, `session_${sessionId}.pkl`);
    this.cleanupTempFile(pickleFile);

    // Remove any temp files that might be orphaned for this session
    // This handles edge cases where execution was interrupted
    this.cleanupTempFiles();
  }

  /**
   * Clean up all temporary files (exec scripts, output files, code files)
   * Returns the number of files cleaned up
   */
  cleanupTempFiles(): number {
    let count = 0;
    if (!existsSync(this.sessionDir)) {
      return count;
    }

    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.sessionDir);

      for (const file of files) {
        // Clean up temporary execution files but preserve pickle files
        if (
          file.startsWith('exec_') ||
          file.startsWith('output_') ||
          file.startsWith('code_')
        ) {
          const filePath = join(this.sessionDir, file);
          this.cleanupTempFile(filePath);
          count++;
        }
      }
    } catch (err) {
      // Silently ignore directory read errors
    }

    return count;
  }

  /**
   * Clean up all session pickle files
   * Useful for clearing all session state
   */
  cleanupAllSessions(): number {
    let count = 0;
    if (!existsSync(this.sessionDir)) {
      return count;
    }

    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.sessionDir);

      for (const file of files) {
        if (file.startsWith('session_') && file.endsWith('.pkl')) {
          const filePath = join(this.sessionDir, file);
          this.cleanupTempFile(filePath);
          count++;
        }
      }
    } catch (err) {
      // Silently ignore directory read errors
    }

    return count;
  }

  /**
   * Comprehensive cleanup of all files in session directory
   * Use with caution - removes ALL files including active sessions
   */
  cleanupAll(): number {
    let count = 0;
    if (!existsSync(this.sessionDir)) {
      return count;
    }

    try {
      const fs = require('fs');
      const files = fs.readdirSync(this.sessionDir);

      for (const file of files) {
        const filePath = join(this.sessionDir, file);
        this.cleanupTempFile(filePath);
        count++;
      }
    } catch (err) {
      // Silently ignore directory read errors
    }

    return count;
  }
}
