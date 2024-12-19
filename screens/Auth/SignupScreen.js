import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export default function SignupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignup = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Hardcode et groupId for nu, f.eks. "group123"
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                color: '#FF0000', // midlertidig farve, kan senere gøres bruger-vælgbart
                groups: [] // tom array ved oprettelse
            });
            navigation.replace('GroupList');
        } catch (error) {
            console.log(error);
            alert('Oprettelse af konto fejlede. Prøv igen.');
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineLarge">Opret konto</Text>
            <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
            />
            <TextInput
                label="Adgangskode"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
            />
            <Button mode="contained" onPress={handleSignup} style={styles.button}>
                Opret konto
            </Button>
            <Button onPress={() => navigation.navigate('Login')}>Tilbage til login</Button>
        </View>
    );
}

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
