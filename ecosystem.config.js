module.exports = {
	apps: [
		{
			name: "google-drive-backuper",
			script: "index.js",
			args: "backup config.json",
			env: {
				NODE_NO_WARNINGS: 1,
			},
		},
	],
};
