import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';

/**
 * LoginScreen:
 *  - User logger ind med email og password.
 *  - Ved succes -> navigerer til GroupList (oversigt over User grupper).
 *  - Viser en knap til at gå til SignupScreen.
 */
export default function LoginScreen({ navigation }) {
    // State til email og password felter
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    /**
     * handleLogin:
     * - Kalder Firebase Auth med signInWithEmailAndPassword.
     * - Ved succes -> navigation.replace('GroupList').
     * - Ved fejl -> alert, fx "Login fejlede."
     */
    const handleLogin = () => {
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Hvis login er succesfuldt -> gå til GroupList
                navigation.replace('GroupList');
            })
            .catch((error) => {
                console.log(error);
                alert('Login fejlede. Tjek dine oplysninger.');
            });
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineLarge">Log ind</Text>

            {/* Email-input */}
            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
            />

            {/* Password-input */}
            <TextInput
                label="Adgangskode"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />

            {/* Knap til at logge ind */}
            <Button mode="contained" onPress={handleLogin} style={styles.button}>
                Log ind
            </Button>

            {/* Knappen nederst -> naviger til SignupScreen */}
            <Button onPress={() => navigation.navigate('Signup')}>
                Opret konto
            </Button>
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginVertical: 10,
    },
});