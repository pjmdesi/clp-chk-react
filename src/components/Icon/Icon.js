import React from 'react';
import { icons } from 'lucide-react';

const Icon = ({ name="Feather", color="white", size, ...props }) => {
	const LucideIcon = icons[name];

    if (!LucideIcon) {
        console.warn(`Icon "${name}" does not exist in lucide-react icons.`);
    }


	return LucideIcon ? <LucideIcon color={color} size={size} {...props} /> : null;
};

export default Icon;