import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import OperatorCard, { OperatorCardProps } from "./operator_card"; 

describe("OperatorCard", () => {
    const defaultProps: OperatorCardProps = {
        displayName: "Test Operator",
        key: "test-operator",
        operatorLogoUrl: "https://example.com/logo.png",
        operatorDescription: "This is a test operator",
        onClickCheckBox: jest.fn(),
        isRequired: false,
        isChecked: false,
        deploymentRequestState: "idle",
        isLoading: false,
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders the operator details correctly", () => {
        render(<OperatorCard {...defaultProps} />);

        expect(screen.getByAltText("Test Operator")).toBeInTheDocument();
        expect(screen.getByText("Test Operator")).toBeInTheDocument();
        expect(screen.getByText("This is a test operator")).toBeInTheDocument();
    });

    it("renders the 'REQUIRED' chip when isRequired is true", () => {
        render(<OperatorCard {...defaultProps} isRequired />);

        expect(screen.getByText("REQUIRED")).toBeInTheDocument();
    });

    it("renders the 'DEPLOYED' chip when isChecked is true and deploymentRequestState is 'succeeded'", () => {
        render(
            <OperatorCard
                {...defaultProps}
                isChecked
                deploymentRequestState="succeeded"
            />
        );

        expect(screen.getByText("DEPLOYED")).toBeInTheDocument();
    });

    it("renders a loading indicator when isLoading is true", () => {
        render(<OperatorCard {...defaultProps} isLoading />);

        expect(screen.getByRole("progressbar")).toBeInTheDocument();
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument(); // Checkbox should not be rendered when loading
    });

    it("calls onClickCheckBox when the card or checkbox is clicked and not required or deployed", () => {
        const props = {...defaultProps, onClickCheckBox: jest.fn()};
        const {getByRole} = render(<OperatorCard {...props} />);

        // Click the card
        fireEvent.click(getByRole("button")); 
        expect(props.onClickCheckBox).toHaveBeenCalledWith(true);
    });

    it("does not call onClickCheckBox when isRequired is true", () => {
        render(<OperatorCard {...defaultProps} isRequired />);

        // Click the card
        fireEvent.click(screen.getByRole("button"));
        expect(defaultProps.onClickCheckBox).not.toHaveBeenCalled();

        // Click the checkbox (should be disabled)
        fireEvent.click(screen.getByRole("checkbox"));
        expect(defaultProps.onClickCheckBox).not.toHaveBeenCalled();
    });

    it("does not call onClickCheckBox when isDeployed is true", () => {
        render(
            <OperatorCard
                {...defaultProps}
                isChecked
                deploymentRequestState="succeeded"
            />
        );

        // Click the card
        fireEvent.click(screen.getByRole("button"));
        expect(defaultProps.onClickCheckBox).not.toHaveBeenCalled();

        // Click the checkbox (should be disabled)
        fireEvent.click(screen.getByRole("checkbox"));
        expect(defaultProps.onClickCheckBox).not.toHaveBeenCalled();
    });
});