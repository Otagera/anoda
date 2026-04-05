import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Album } from "~/types";
import { AlbumCard } from "../AlbumCard";

describe("AlbumCard Component", () => {
	const mockAlbum: Album = {
		id: "album-1",
		albumName: "Summer Vacation",
		_count: { images: 12 },
		coverImages: ["image1.jpg", "image2.jpg", "image3.jpg", "image4.jpg"],
		userId: "user-1",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	it("renders album name and photo count", () => {
		render(
			<MemoryRouter>
				<AlbumCard album={mockAlbum} />
			</MemoryRouter>,
		);

		expect(screen.getByText("Summer Vacation")).toBeInTheDocument();
		expect(screen.getByText("12 photos")).toBeInTheDocument();
	});

	it("renders 4 cover images when available", () => {
		render(
			<MemoryRouter>
				<AlbumCard album={mockAlbum} />
			</MemoryRouter>,
		);

		const images = screen.getAllByRole("img");
		// 4 cover images + 1 for the MoreVertical icon (if lucide renders as img, but it usually doesn't.
		// Actually AlbumCover renders <img> tags.
		expect(
			images.filter((img) => img.getAttribute("src")?.startsWith("image")),
		).toHaveLength(4);
	});

	it("renders a single cover image when fewer than 4 are available", () => {
		const smallAlbum = { ...mockAlbum, coverImages: ["only-one.jpg"] };
		render(
			<MemoryRouter>
				<AlbumCard album={smallAlbum} />
			</MemoryRouter>,
		);

		const images = screen.getAllByRole("img");
		expect(
			images.filter((img) => img.getAttribute("src") === "only-one.jpg"),
		).toHaveLength(1);
	});

	it("renders fallback stylized text when no cover images exist", () => {
		const emptyAlbum = { ...mockAlbum, coverImages: [] };
		render(
			<MemoryRouter>
				<AlbumCard album={emptyAlbum} />
			</MemoryRouter>,
		);

		expect(screen.getByText("S")).toBeInTheDocument(); // First letter of Summer
	});

	it("navigates to the album page on click", () => {
		render(
			<MemoryRouter>
				<AlbumCard album={mockAlbum} />
			</MemoryRouter>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/album/album-1");
	});

	it("opens the menu and triggers onEdit/onDelete", () => {
		const onEdit = vi.fn();
		const onDelete = vi.fn();

		render(
			<MemoryRouter>
				<AlbumCard album={mockAlbum} onEdit={onEdit} onDelete={onDelete} />
			</MemoryRouter>,
		);

		// Click the "More" button
		const menuButton = screen.getByRole("button");
		fireEvent.click(menuButton);

		// Check if Edit and Delete buttons appear
		const editButton = screen.getByText("Edit");
		const deleteButton = screen.getByText("Delete");

		fireEvent.click(editButton);
		expect(onEdit).toHaveBeenCalledWith(mockAlbum);

		// Re-open menu for delete test
		fireEvent.click(menuButton);
		fireEvent.click(screen.getByText("Delete"));
		expect(onDelete).toHaveBeenCalledWith(mockAlbum.id);
	});
});
