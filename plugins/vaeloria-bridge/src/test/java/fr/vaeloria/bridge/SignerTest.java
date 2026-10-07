package fr.vaeloria.bridge;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SignerTest {
    /**
     * Vecteur partagé avec l'API Node (apps/api/test/hmac-vector.test.ts) :
     * si l'un des deux côtés change d'algorithme, les deux tests échouent.
     */
    @Test
    void signatureIdentiqueALApi() {
        String sig = Signer.sign("s".repeat(64), "1700000000000", "nonce-0123456789abcdef", "{\"events\":[]}");
        assertEquals("3c42a376341546d040cd59c2d02b4b2e4c1737cbbc6b8be9170d5149a9038e15", sig);
    }
}
