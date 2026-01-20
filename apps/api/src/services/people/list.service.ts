import {
	aliaserSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";
import { getPeople } from "../../../../../packages/models/src/people.model.ts";

const aliasSpec = {
	response: {
		person_id: "personId",
		name: "name",
		created_at: "createdAt",
	},
};

const service = async () => {
	const people = await getPeople();

	return people.map((person) => aliaserSpec(aliasSpec.response, person));
};

export default service;
