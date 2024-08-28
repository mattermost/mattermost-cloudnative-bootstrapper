import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateInstallationCard from './create_installation_card'; // Adjust the path if needed

describe('CreateInstallationCard', () => {
    it('renders the ControlPointIcon', () => {
        render(<CreateInstallationCard onClick={jest.fn()} />);
        // Assuming you have a data-testid on the ControlPointIcon
        expect(screen.getByTestId('ControlPointIcon')).toBeInTheDocument();
    });

    it('calls onClick prop when clicked', () => {
        const onClickMock = jest.fn();
        render(<CreateInstallationCard onClick={onClickMock} />);

        const card = screen.getByRole('button'); // Assuming the Card is rendered as a button
        fireEvent.click(card);

        expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('has the correct CSS class', () => {
        const { container } = render(<CreateInstallationCard onClick={jest.fn()} />);
        expect(container.firstChild).toHaveClass('installation-card');
    });
});