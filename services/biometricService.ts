
export const isBiometricAvailable = async () => {
  if (!window.PublicKeyCredential) return false;
  return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
};

export const registerBiometrics = async (username: string) => {
  try {
    const available = await isBiometricAvailable();
    if (!available) throw new Error("Biometria non supportata su questo dispositivo.");

    // This is a simplified WebAuthn implementation for demo purposes
    // In a production app, the 'challenge' and 'user.id' should come from the server
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: { name: "CostruGest", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(username),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }], // ES256
      authenticatorSelection: { userVerification: "required" },
      timeout: 60000,
    };

    const credential = await navigator.credentials.create({ publicKey });
    if (credential) {
      localStorage.setItem(`biometric_reg_${username}`, "true");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Biometric Registration Error:", error);
    return false;
  }
};

export const authenticateBiometrics = async (username: string) => {
  try {
    if (!localStorage.getItem(`biometric_reg_${username}`)) {
      return false;
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [], // In a real app, you'd provide the registered credential ID
      userVerification: "required",
      timeout: 60000,
    };

    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch (error) {
    console.error("Biometric Authentication Error:", error);
    return false;
  }
};
