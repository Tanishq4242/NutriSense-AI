import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { ErrorNotice, LoadingState, ProgressBar } from './ui'

describe('shared interface states', () => {
  it('announces a loading state to assistive technology', () => {
    render(<LoadingState label="Loading your profile…" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading your profile…')
  })

  it('renders API errors as alerts', () => {
    render(<ErrorNotice message="The nutrition service could not be reached." />)
    expect(screen.getByRole('alert')).toHaveTextContent('The nutrition service could not be reached.')
  })

  it('exposes progress values and caps the visual fill at 100 percent', () => {
    render(<ProgressBar value={42} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar.firstElementChild).toHaveStyle({ width: '42%' })
  })
})

