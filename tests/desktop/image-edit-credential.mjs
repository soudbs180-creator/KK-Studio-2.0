/** A refused credential must never become eligible for fixture cleanup. */
export async function claimFixtureCredential(invoke, providerId) {
  if ((await invoke("credential_get", { providerId })) !== null)
    throw new Error("Fixture must never overwrite an existing credential");
  return providerId;
}

export async function releaseFixtureCredential(invoke, providerId) {
  await invoke("credential_delete", { providerId });
  if ((await invoke("credential_get", { providerId })) !== null)
    throw new Error("Owned fixture credential was not removed");
}
