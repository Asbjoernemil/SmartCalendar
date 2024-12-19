import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';

export default function GroupsScreen({ navigation }) {
    const [currentGroupId, setCurrentGroupId] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [joinGroupId, setJoinGroupId] = useState('');
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigation.replace('Login');
                return;
            }
            const userDocRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                setUserData(data);
                // Her arbejder vi ikke længere med groupId, men med groups array
                // Hvis data.groups ikke findes eller er tomt, er brugeren ikke i nogen grupper
                // currentGroupId giver måske ikke længere mening her, da brugeren kan være i flere grupper
                // Du kan vise den "første" gruppe eller lade være.
                setCurrentGroupId(data.groups && data.groups.length > 0 ? data.groups[0] : null);
            } else {
                setUserData({});
            }
        };
        fetchUserData();
    }, []);

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert('Indtast et gruppenavn');
            return;
        }
        const user = auth.currentUser;
        const groupRef = await addDoc(collection(db, 'groups'), {
            name: groupName,
            createdBy: user.uid
        });

        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
            ...userData,
            groups: userData && userData.groups ? [...userData.groups, groupRef.id] : [groupRef.id]
        }, { merge: true });

        // Opdater currentGroupId for at vise at brugeren nu er i en gruppe (valgfrit)
        setCurrentGroupId(groupRef.id);
        alert('Gruppe oprettet og du er nu medlem af den.');
        setGroupName('');

        // Tilføj denne linje:
        navigation.navigate('GroupList'); // Tilbage til gruppelisten
    };

    const handleJoinGroup = async () => {
        if (!joinGroupId.trim()) {
            alert('Indtast en gruppe-ID for at deltage');
            return;
        }

        const groupDocRef = doc(db, 'groups', joinGroupId);
        const groupSnap = await getDoc(groupDocRef);
        if (!groupSnap.exists()) {
            alert('Gruppe ikke fundet. Tjek gruppe-ID');
            return;
        }

        const user = auth.currentUser;
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
            ...userData,
            groups: userData && userData.groups ? [...userData.groups, joinGroupId] : [joinGroupId]
        }, { merge: true });

        setCurrentGroupId(joinGroupId);
        alert('Du har tilsluttet dig gruppen.');
        setJoinGroupId('');

        // Tilføj denne linje:
        navigation.navigate('GroupList'); // Tilbage til gruppelisten
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium">Gruppeindstillinger</Text>

            {userData && userData.groups && userData.groups.length > 0 ? (
                <>
                    <Text>Du er medlem af følgende grupper:</Text>
                    {userData.groups.map((g) => (
                        <Text key={g}>- {g}</Text>
                    ))}
                    <Text>Hvis du vil skifte eller tilføje en gruppe, kan du gøre det nedenfor.</Text>
                </>
            ) : (
                <Text>Du er ikke i nogen gruppe.</Text>
            )}

            <Text variant="headlineSmall" style={{ marginTop: 20 }}>Opret ny gruppe</Text>
            <TextInput
                label="Gruppenavn"
                value={groupName}
                onChangeText={setGroupName}
                style={styles.input}
            />
            <Button mode="contained" onPress={handleCreateGroup} style={styles.button}>
                Opret gruppe
            </Button>

            <Text variant="headlineSmall" style={{ marginTop: 20 }}>Deltag i eksisterende gruppe</Text>
            <TextInput
                label="Gruppe ID"
                value={joinGroupId}
                onChangeText={setJoinGroupId}
                style={styles.input}
            />
            <Button mode="contained" onPress={handleJoinGroup} style={styles.button}>
                Deltag i gruppe
            </Button>

            <Button
                mode="contained"
                onPress={() => navigation.navigate('GroupList')}
                style={{ marginTop: 20 }}
            >
                Tilbage til gruppeliste
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-start',
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginVertical: 10,
    },
});
