"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
/**
 * Executes a command in the background and returns immediately.
 * @param {string} command The command to execute.
 * @param {string[]} args An array of arguments to pass to the command.
 * @param {object} options Options to pass to the child process. See: https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options
 * @returns {object} An object containing the child process.
 */
function executeInBackground(command, args = [], options = {}) {
    // Ensure detached is true and stdio is set to ignore.  This is crucial
    // for the child process to outlive the parent.
    const defaultOptions = {
        detached: true,
        stdio: 'ignore', // Prevents blocking on stdio
        shell: true,
    };
    //const mergedOptions = { ...defaultOptions, ...options };
    const child = (0, child_process_1.spawn)(command, args, {
        detached: true,
        stdio: 'ignore', // Prevents blocking on stdio
        shell: true,
    });
    // Unref the child process.  This allows the parent process to exit
    // even if the child is still running.
    child.unref();
    return child;
}
const overlayAppPath = path.join(__dirname, 'live2d-container');
//executeInBackground("npx", ['electron', overlayAppPath]);
(0, child_process_1.exec)(`npx electron ${overlayAppPath}`, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});
//# sourceMappingURL=test.js.map