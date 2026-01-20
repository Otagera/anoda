import Joi from "joi";
import { createPerson } from "../../../../../packages/models/src/people.model.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = Joi.object({
	name: Joi.string().required().min(1).max(100),
});

const aliasSpec = {
	request: {
		name: "name",
	},
	response: {
		person_id: "personId",
		name: "name",
		created_at: "createdAt",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const person = await createPerson(params.name);

	return aliaserSpec(aliasSpec.response, person);
};

export default service;
