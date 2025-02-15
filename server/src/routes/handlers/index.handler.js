const handler = {
	method: "get",
	handler: async function (req, res) {
		return res.send({ status: true });
	},
	path: "/",
	middlewares: [],
};
module.exports = handler;
