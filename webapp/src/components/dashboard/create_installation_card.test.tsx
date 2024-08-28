import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateInstallationCard from './create_installation_card';

describe('CreateInstallationCard', () => {
    it('renders the ControlPointIcon', () => {
        render(<CreateInstallationCard onClick={jest.fn()} />);
        expect(screen.getByTestId('ControlPointIcon')).toBeInTheDocument();
    });

    it('calls onClick prop when clicked', () => {
        const onClickMock = jest.fn();
        render(<CreateInstallationCard onClick={onClickMock} />);

        const card = screen.getByRole('button');
        fireEvent.click(card);

        expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('has the correct CSS class', () => {
        const { getByTestId } = render(<CreateInstallationCard onClick={jest.fn()} />);
        expect(getByTestId('create-installation-card-root')).toHaveClass('installation-card');
    });
});