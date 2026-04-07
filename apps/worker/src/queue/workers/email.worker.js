const {
	sendResetPasswordEmail,
	sendWelcomeEmail,
	sendPhotoApprovedEmail,
	sendClusteringCompleteEmail,
} = require("@email/email.service.ts");

const run = async (jobData) => {
	const { type, data } = jobData;

	console.log(`[EMAIL WORKER] Processing ${type} email for ${data.email}`);

	switch (type) {
		case "reset_password":
			await sendResetPasswordEmail(data.email, data.token);
			break;
		case "welcome":
			await sendWelcomeEmail(data.email);
			break;
		case "photo_approved":
			await sendPhotoApprovedEmail(data.email, data.albumName);
			break;
		case "clustering_complete":
			await sendClusteringCompleteEmail(data.email, data.albumName);
			break;
		default:
			console.warn(`[EMAIL WORKER] Unknown email type: ${type}`);
	}
};

module.exports = run;
