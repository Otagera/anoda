import { getPeople } from "../../../../../packages/models/src/people.model.ts";
import { aliaserSpec } from "../../../../../packages/utils/src/specValidator.util.ts";
import { normalizeImagePath } from "../../../../../packages/utils/src/image.util.ts";

const aliasSpec = {
	response: {
		person_id: "personId",
		name: "name",
		created_at: "createdAt",
	},
};

const service = async (user_id: string) => {
	const people = await getPeople(user_id);

	return people.map((person: any) => {
		const base = aliaserSpec(aliasSpec.response, person);
		
		const firstFace = person.faces?.[0];
		if (firstFace?.images) {
			base.faceUrl = normalizeImagePath(firstFace.images.optimized_path || firstFace.images.image_path);
			base.boundingBox = firstFace.bounding_box;
		}
		
		return base;
	});
};

export default service;
