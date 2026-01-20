const handler = {
	method: "get",
	handler: async (_req, res) => res.send({ status: true }),
	path: "/",
	middlewares: [],
};
export default handler;
