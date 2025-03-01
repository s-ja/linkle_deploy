import { Divider, DividerType } from "../types";
import Image from "next/image";

interface DividerSelectorProps {
  onSelect: (divider: DividerType) => void;
  selected: DividerType;
}

export default function DividerSelector({
  onSelect,
  selected,
}: DividerSelectorProps) {
  const dividers: {
    name: DividerType;
    displayName: string;
    icon: string | JSX.Element;
  }[] = [
    { name: "Space", displayName: "공백", icon: " " },
    { name: "Dashed", displayName: "점선", icon: "┈┈" },
    { name: "Solid", displayName: "실선", icon: "───" },
    { name: "Point", displayName: "포인트", icon: "· · ·" },
    {
      name: "Zigzag",
      displayName: "지그재그",
      icon: (
        <Image
          src="/assets/icons/item_zigzag.png"
          alt="Zigzag"
          width={60}
          height={5}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center">
        <p>구분선 모양</p>
        <span className="ml-1 text-red-500">*</span>
      </div>
      <div className="flex space-x-4">
        {dividers.map((divider) => (
          <div key={divider.name} className="flex flex-col items-center">
            <button
              className={`flex h-16 w-16 items-center justify-center rounded-xl border ${
                selected === divider.name ? "border-black" : "border-gray-300"
              }`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(divider.name as DividerType);
              }}
              type="button"
            >
              <span className="text-2xl">{divider.icon}</span>
            </button>
            <span className="mt-2">{divider.displayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
