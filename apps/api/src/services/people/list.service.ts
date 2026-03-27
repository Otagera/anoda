import { getPeople } from "../../../../../packages/models/src/people.model.ts";
import { aliaserSpec } from "../../../../../packages/utils/src/specValidator.util.ts";

const aliasSpec = {
	response: {
		person_id: "personId",
		name: "name",
		created_at: "createdAt",
	},
};

const service = async (user_id: string) => {
	const people = await getPeople(user_id);

	return people.map((person) => aliaserSpec(aliasSpec.response, person));
};

export default service;
