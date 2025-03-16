import { ChildProcess, spawn, SpawnOptions, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';


/**
 * Executes a command in the background and returns immediately.
 * @param {string} command The command to execute.
 * @param {string[]} args An array of arguments to pass to the command.
 * @param {object} options Options to pass to the child process. See: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
 * @returns {object} An object containing the child process.
 */
function executeInBackground(command: string, args: string[] = [], options: SpawnOptions = {}): ChildProcess {
  // Ensure detached is true and stdio is set to ignore.  This is crucial
  // for the child process to outlive the parent.
  const defaultOptions = {
    detached: true,
    stdio: 'ignore', // Prevents blocking on stdio
    shell: true,

  };

  //const mergedOptions = { ...defaultOptions, ...options };

  const child = spawn(
    command, 
    args, 
    {
        detached: true,
        stdio: 'ignore', // Prevents blocking on stdio
        shell: true,
    }
  );

  // Unref the child process.  This allows the parent process to exit
  // even if the child is still running.
  child.unref();

  return child;
}

const overlayAppPath = path.join(__dirname, 'live2d-container');

//executeInBackground("npx", ['electron', overlayAppPath]);

exec(`npx electron ${overlayAppPath}`, (err, stdout, stderr) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});