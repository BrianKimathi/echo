import { useState, useEffect, useCallback } from 'react'

export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, loading, error, setData, reload: run }
}

export const useAsyncList = (fetcher, deps = []) => {
  const { data, loading, error, setData, reload } = useAsync(fetcher, deps)
  return { items: data || [], loading, error, setItems: setData, reload }
}
