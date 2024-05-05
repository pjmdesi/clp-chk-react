import React from 'react';
import { icons } from 'lucide-react';

const Icon = ({ name="Feather", color="white", size, ...props }) => {
	const LucideIcon = icons[name];

	// return null;
	return <LucideIcon color={color} size={size} {...props} />;
};

export default Icon;