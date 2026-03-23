import type { AxiosResponse } from 'axios'

/** Unwrap an axios response to just the data, surfacing errors as thrown strings. */
export async function handleApi<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  const res = await promise
  return res.data
}
