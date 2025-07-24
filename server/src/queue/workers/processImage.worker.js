const welcomeEmail = require("@email/services/welcomeEmail.service");

const run = async (data) => {
  try {
    console.log("data", data);

    return { status: "string", message: `message` };
  } catch (error) {
    throw new Error(error);
  }
};
module.exports = run;
