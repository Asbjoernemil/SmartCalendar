import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export default function SignupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');

    const colors = [
        '#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFA500', '#008080', '#800080',
        '#00FFFF', '#FFD700', '#FF6347', '#4682B4', '#6A5ACD', '#7FFF00', '#DC143C',
        '#A52A2A', '#5F9EA0', '#7B68EE', '#ADFF2F', '#4B0082', '#FF1493', '#696969',
        '#1E90FF', '#B22222', '#228B22', '#FF4500', '#D2691E', '#DAA520', '#8A2BE2',
        '#BDB76B', '#CD5C5C', '#F08080', '#20B2AA', '#778899', '#C71585', '#191970',
        '#98FB98', '#DB7093', '#FF69B4', '#2E8B57', '#4682B4', '#FF8C00', '#8B0000',
        '#00CED1', '#32CD32', '#FFB6C1', '#9ACD32', '#EE82EE', '#F4A460', '#8FBC8F',
        '#F5DEB3', '#D2B48C', '#A9A9A9', '#BC8F8F', '#808080', '#FF7F50', '#00BFFF'
    ];

    const handleSignup = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                displayName: displayName || user.email, // displayName eller email
                color: colors[Math.floor(Math.random() * colors.length)],
                groups: []
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
                label="Brugernavn"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
            />
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
