import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import flagGb from "@/assets/flags/gb.png";
import flagTh from "@/assets/flags/th.png";
import { Pill } from "./Pill";

const meta = {
  title: "Components/Pill",
  component: Pill,
  args: {
    variant: "degree",
    children: "Bachelor's",
    selected: false,
    onClick: fn(),
  },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Degree: Story = {};

export const DegreeSelected: Story = {
  args: { selected: true },
};

const flag = (src: string) => (
  <img src={src} alt="" className="size-9 rounded-full object-cover" />
);

export const Language: Story = {
  args: { variant: "lang", children: <>{flag(flagGb)}ENGLISH</> },
};

export const LanguageSelected: Story = {
  args: { variant: "lang", children: <>{flag(flagTh)}THAI</>, selected: true },
};

export const Choice: Story = {
  args: { variant: "choice", children: "YES" },
};
