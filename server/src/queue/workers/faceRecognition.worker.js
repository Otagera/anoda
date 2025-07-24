const { spawn } = require("child_process");
const prisma = require("@config/db.config");
const path = require("path");

const run = async (jobData) => {
  const { imageId, imagePath } = jobData;

  try {
    console.log(`Processing image: ${imagePath} for face recognition.`);

    const pythonProcess = spawn("python", [
      path.join(__dirname, "..", "..", "..", "scripts", "face_recognition.py"),
      imagePath,
    ]);

    let scriptOutput = "";
    pythonProcess.stdout.on("data", (data) => {
      scriptOutput += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`Python script error for ${imagePath}: ${data}`);
    });

    await new Promise((resolve, reject) => {
      pythonProcess.on("close", async (code) => {
        if (code === 0) {
          try {
            const faceData = JSON.parse(scriptOutput);
            for (const face of faceData.faces) {
              await prisma.faces.create({
                data: {
                  image_id: imageId,
                  embedding: face.embedding,
                  bounding_box: face.boundingBox,
                  processed_time: new Date(),
                },
              });
            }
            console.log(`Face data saved for image: ${imagePath}`);
            resolve();
          } catch (parseError) {
            console.error(
              `Failed to parse Python script output for ${imagePath}:`,
              parseError
            );
            reject(parseError);
          }
        } else {
          console.error(`Python script exited with code ${code} for ${imagePath}`);
          reject(new Error(`Python script failed for ${imagePath}`));
        }
      });
    });
    return { status: "success", message: `Face recognition completed for ${imagePath}` };
  } catch (error) {
    console.error("Error processing face recognition task:", error);
    throw error;
  }
};

module.exports = run;
