import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { SubmitComplaint } from "./SubmitComplaint";
import { complaintSamples } from "./samples";

it("selects an editable example and moves focus to the complaint", async () => {
  const user = userEvent.setup();
  render(<SubmitComplaint />);
  const example = screen.getByRole("button", { name: "Road damage" });
  await user.click(example);
  const editor = screen.getByLabelText("Your complaint");
  expect(editor).toHaveValue(complaintSamples[0].text);
  expect(editor).toHaveFocus();
  expect(example).toHaveAttribute("aria-pressed", "true");
  await user.type(editor, " Near the school.");
  expect(editor).toHaveValue(`${complaintSamples[0].text} Near the school.`);
  expect(example).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getByRole("button", { name: "Use your voice" }));
  await user.click(screen.getByRole("button", { name: "Type a complaint" }));
  expect(screen.getByLabelText("Your complaint")).toHaveValue(
    `${complaintSamples[0].text} Near the school.`,
  );
});
