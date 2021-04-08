import * as fs from "fs";
import * as core from "@actions/core";
import * as ini from "ini";
import * as path from "path";
import * as os from "os";

export function checkStorageDriver(filePaths: string[]): void {
    const filePath = checkStorageFile(filePaths);
    if (filePath) {
        core.info("Reading storage file to find out the storage driver used");
        const fileContent = ini.parse(fs.readFileSync(filePath, "utf-8"));
        const storageDriver = fileContent.storage.driver;
        core.info(`Storage driver is set to "${storageDriver}"`);

        // Check for storage-driver, if overlay then and
        // add mount program as "fuse-overlayfs" in ~/.config/containers/storage.conf
        if (storageDriver === "overlay") {
            // Backup file if ~/.config/containers/storage.conf exists
            if (filePath === filePaths[0]) {
                backupFile(filePath);
            }
            addMountProgram();
        }
    }
    else {
        addMountProgram();
    }
}

function checkStorageFile(filePaths: string[]): string {
    for (const filePath of filePaths) {
        core.debug(`Checking if the storage file exists at ${filePath}`);
        if (fs.existsSync(filePath)) {
            core.debug(`Storage file exists at ${filePath}`);
            return filePath;
        }
    }
    return "";
}

function backupFile(filePath: string): void {
    core.debug(`Creating backup of the existing "storage.conf" file`);
    fs.copyFileSync(`${filePath}`, `${filePath}.backup`);
    core.debug(`Backup created at ${filePath}.backup`);
}

function addMountProgram(): void {
    core.debug(`Creating directory "~/.config/containers" recursively`);
    const homedir = os.homedir();
    const targetDir = path.join(homedir, ".config/containers");

    fs.mkdirSync(targetDir, { recursive: true });
    core.debug("Directory created successfully");

    const fileName = "storage.conf";

    const mountProgramData = "[storage.options]\nmount_program=\"/usr/bin/fuse-overlayfs\"";

    core.info(`Creating "${fileName}" and adding "fuse-overlayfs" in the mount program`);
    fs.appendFileSync(`${targetDir}/${fileName}`, mountProgramData);
}

export function restoreFile(filePath: string): void {
    // Check if backup exists or not.
    if (fs.existsSync(`${filePath}.backup`)) {
        core.debug(`Backup file found, restoring the original "storage.conf" file`);
        fs.unlinkSync(filePath);
        fs.copyFileSync(`${filePath}.backup`, filePath);
    }
    else {
        core.debug(`Backup file not found, deleting the created "storage.conf" file`);
        fs.unlinkSync(filePath);
    }
}
