import { fireEvent, render, screen } from "@testing-library/react";
import type * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { vi } from "vitest";
import { FormBuilderField } from "./FormBuilderField";

vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [null],
}));

const renderComponent = ({
  props,
  formDefaultValues,
}: {
  props: Parameters<typeof FormBuilderField>[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formDefaultValues?: any;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let formMethods: UseFormReturn<any> | undefined;
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const form = useForm({
      defaultValues: formDefaultValues,
    });
    formMethods = form;
    return <FormProvider {...form}>{children}</FormProvider>;
  };
  render(<FormBuilderField {...props} />, { wrapper: Wrapper });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { formMethods: formMethods! };
};

describe("FormBuilderField", () => {
  it("verify a text type input field", () => {
    const { formMethods } = renderComponent({
      props: {
        field: {
          name: "textInput1",
          type: "text",
          label: "Text Input 1",
          placeholder: "Enter text",
        },
        readOnly: false,
        className: "",
      },
      formDefaultValues: {},
    });
    expect(component.getFieldInput({ label: "Text Input 1" }).value).toEqual("");
    component.fillFieldInput({ label: "Text Input 1", value: "test" });
    expectScenario.toHaveFieldValue({
      label: "Text Input 1",
      identifier: "textInput1",
      value: "test",
      formMethods,
    });
  });
});

const component = {
  getFieldInput: ({ label }: { label: string }) =>
    screen.getByRole("textbox", { name: label }) as HTMLInputElement,
  fillFieldInput: ({ label, value }: { label: string; value: string }) => {
    fireEvent.change(component.getFieldInput({ label }), { target: { value } });
  },
};

const expectScenario = {
  toHaveFieldValue: ({
    identifier,
    label,
    value,
    formMethods,
  }: {
    identifier: string;
    label: string;
    value: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formMethods: UseFormReturn<any>;
  }) => {
    expect(component.getFieldInput({ label }).value).toEqual(value);
    expect(formMethods.getValues(`responses.${identifier}`)).toEqual(value);
  },
};

// Locks the autocomplete semantics of the "name" booking field variants
// (added upstream by #24422) so they stay consistent with the #18786 fix
describe("FormBuilderField name field autocomplete semantics (issue #18786)", () => {
  it("uses the 'name' token for the full name variant", () => {
    renderComponent({
      props: {
        field: {
          name: "name",
          type: "name",
          label: "Your name",
        },
        readOnly: false,
        className: "",
      },
      formDefaultValues: { responses: { name: "" } },
    });

    const nameInput = document.querySelector('input[name="name"]');

    expect(nameInput).toBeInTheDocument();
    expect(nameInput?.getAttribute("autocomplete")).toBe("name");
  });

  it("uses given-name/family-name tokens for the split first/last name variant", () => {
    renderComponent({
      props: {
        field: {
          name: "name",
          type: "name",
          variant: "firstAndLastName",
          label: "Your name",
        },
        readOnly: false,
        className: "",
      },
      formDefaultValues: { responses: { name: { firstName: "", lastName: "" } } },
    });

    const firstNameInput = document.querySelector('input[name="firstName"]');
    const lastNameInput = document.querySelector('input[name="lastName"]');

    expect(firstNameInput).toBeInTheDocument();
    expect(firstNameInput?.getAttribute("autocomplete")).toBe("given-name");
    expect(lastNameInput).toBeInTheDocument();
    expect(lastNameInput?.getAttribute("autocomplete")).toBe("family-name");
  });
});
