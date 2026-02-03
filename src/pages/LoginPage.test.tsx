import React from 'react';
import { describe, beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const mockNavigate = vi.fn();
let mockAuthState;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const renderLoginPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

test('LoginPage test harness loads', () => {
  expect(renderLoginPage).toBeDefined();
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockAuthState = {
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      signInWithGoogle: vi.fn(),
      resetPassword: vi.fn(),
      loading: false,
      error: null,
    };
  });

  test('redirects to chat on successful login', async () => {
    mockAuthState.login.mockResolvedValue({ uid: 'user-123' });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'hunter2' } });

    fireEvent.click(screen.getByRole('button', { name: /enter hq/i }));

    await waitFor(() =>
      expect(mockAuthState.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'hunter2',
      }),
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/chat', { replace: true }));
  });

  test('shows error on failed login attempt', async () => {
    mockAuthState.login.mockRejectedValue(new Error('No account found with this email'));

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'missing@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /enter hq/i }));

    await waitFor(() =>
      expect(screen.getByText(/no account found with this email/i)).toBeInTheDocument(),
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('registers without requiring a display name', async () => {
    mockAuthState.register.mockResolvedValue({ uid: 'new-user' });

    renderLoginPage();

    fireEvent.click(screen.getByRole('tab', { name: /register/i }));

    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'StrongPass1' } });

    fireEvent.click(screen.getByRole('button', { name: /request access/i }));

    await waitFor(() =>
      expect(mockAuthState.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'StrongPass1',
      }),
    );

    expect(screen.queryByText(/email and password are required/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/chat', { replace: true }));
  });
});
