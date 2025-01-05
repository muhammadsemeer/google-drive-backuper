require("dotenv").config();
const fs = require("fs");
const { google } = require("googleapis");
const { Command } = require("commander");
const { version } = require("./package.json");

// Load API credentials from JSON file
const apiKeys = require("./api-key.json");

// Define the scope for Google Drive API
const SCOPES = ["https://www.googleapis.com/auth/drive"];

// Function to authorize and get access to Google Drive API
const authorize = async () => {
	const auth = new google.auth.JWT(
		apiKeys.client_email,
		null,
		apiKeys.private_key,
		SCOPES,
	);

	try {
		await auth.authorize();
		return auth;
	} catch (error) {
		throw new Error(`Error authorizing Google Drive API: ${error.message}`);
	}
};

// Function to list available files in Google Drive
const listFiles = async (auth, folderId) => {
	const drive = google.drive({ version: "v3", auth });

	try {
		const response = await drive.files.list({
			q: `'${folderId}' in parents`,
			fields: "files(id, name)",
		});

		return response.data.files;
	} catch (error) {
		throw new Error(`Error listing files in Google Drive: ${error.message}`);
	}
};

// Function to upload a file to Google Drive
const uploadFile = async (auth, filePath, folderId) => {
	const drive = google.drive({ version: "v3", auth });

	const fileMetadata = {
		name: filePath.split("/").pop(), // Extract file name from path
		parents: [folderId], // Folder ID to upload the file into
	};

	const media = {
		mimeType: "application/octet-stream",
		body: fs.createReadStream(filePath), // Readable stream for file upload
	};

	try {
		const response = await drive.files.create({
			resource: fileMetadata,
			media: media,
			fields: "id",
		});

		console.log("File uploaded successfully. File ID:", response.data.id);
		return response.data;
	} catch (error) {
		throw new Error(`Error uploading file to Google Drive: ${error.message}`);
	}
};

// Function to update a file in Google Drive
const updateFile = async (auth, fileId, filePath) => {
	const drive = google.drive({ version: "v3", auth });

	const fileMetadata = {
		name: filePath.split("/").pop(), // Extract file name from path
	};

	const media = {
		mimeType: "application/octet-stream",
		body: fs.createReadStream(filePath), // Readable stream for file update
	};

	try {
		await drive.files.update({
			fileId: fileId,
			resource: fileMetadata,
			media: media,
		});

		console.log("File updated successfully.");
	} catch (error) {
		throw new Error(`Error updating file in Google Drive: ${error.message}`);
	}
};

const isFileExistsAndNotADirectory = (filePath) =>
	fs.existsSync(filePath) && fs.statSync(filePath).isFile();

const upload = async (uploadFileName) => {
	try {
		if (!isFileExistsAndNotADirectory(uploadFileName)) {
			return console.error("File not exists or it's a directory");
		}

		const authClient = await authorize();

		const files = await listFiles(authClient, process.env.FOLDER_ID);

		const isFileExists = files.find((file) => file.name === uploadFileName);

		if (!isFileExists) {
			// Upload a file
			await uploadFile(authClient, uploadFileName, process.env.FOLDER_ID);

			console.log("New file created");
		} else {
			await updateFile(authClient, isFileExists.id, uploadFileName);

			console.log("Updated file");
		}
	} catch (error) {
		console.error(error);
	}
};

const main = async () => {
	const program = new Command();

	program
		.name("Google Drive Backuper")
		.description("Watch files and backup and sync to google drive")
		.version(version);

	program
		.command("upload")
		.description("Upload a single file")
		.argument("<file>", "file to upload")
		.action(upload);

	await program.parseAsync(process.argv);
};

main();
