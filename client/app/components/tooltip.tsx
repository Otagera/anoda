import React from "react";

const Tooltip = ({
	children,
	text,
	tooltipID,
}: {
	children: React.ReactNode;
	text: string;
	tooltipID: string;
}) => {
	return (
		<div className="relative group">
			{children}
			{/* <div
				className={`
          absolute left-1/2 transform -translate-x-1/2 bottom-full
          mb-2 hidden  bg-gray-800 text-white
          text-xs rounded py-1 px-2 z-10
          transition-opacity duration-300 opacity-0 group-hover:opacity-100
        `}
			> */}
			<div
				role="tooltip"
				id={tooltipID}
				className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 transition-opacity duration-300 opacity-0 group-hover:opacity-100"
			>
				{text}
			</div>
		</div>
	);
};

export default Tooltip;
