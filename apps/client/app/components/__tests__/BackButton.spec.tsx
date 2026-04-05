import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BackButton } from "../BackButton";

describe("BackButton Component", () => {
	it("renders the default dashboard link if no props provided", () => {
		render(
			<MemoryRouter>
				<BackButton />
			</MemoryRouter>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/home");
		expect(screen.getByText("Back to Dashboard")).toBeInTheDocument();
	});

	it("renders a link to the provided 'to' prop", () => {
		render(
			<MemoryRouter>
				<BackButton to="/custom-path" label="Go Back" />
			</MemoryRouter>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/custom-path");
		expect(screen.getByText("Go Back")).toBeInTheDocument();
	});

	it("renders a share link if shareToken is provided", () => {
		render(
			<MemoryRouter>
				<BackButton shareToken="test-token" />
			</MemoryRouter>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/share/test-token");
		expect(screen.getByText("Back to Album")).toBeInTheDocument();
	});

	it("contains an arrow span with transition classes", () => {
		render(
			<MemoryRouter>
				<BackButton />
			</MemoryRouter>,
		);

		const arrow = screen.getByText("←");
		expect(arrow).toHaveClass("group-hover:-translate-x-1");
	});
});
