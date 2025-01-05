import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, IconButton, Card } from 'react-native-paper';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

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
            createdBy: user.uid,
        });

        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(
            userDocRef,
            {
                ...userData,
                groups: userData && userData.groups ? [...userData.groups, groupRef.id] : [groupRef.id],
            },
            { merge: true }
        );

        setCurrentGroupId(groupRef.id);
        alert('Gruppe oprettet og du er nu medlem af den.');
        setGroupName('');
        navigation.navigate('GroupList');
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
        await setDoc(
            userDocRef,
            {
                ...userData,
                groups: userData && userData.groups ? [...userData.groups, joinGroupId] : [joinGroupId],
            },
            { merge: true }
        );

        setCurrentGroupId(joinGroupId);
        alert('Du har tilsluttet dig gruppen.');
        setJoinGroupId('');
        navigation.navigate('GroupList');
    };

    const handleLogout = () => {
        signOut(auth)
            .then(() => {
                navigation.replace('Login');
            })
            .catch((error) => {
                console.log(error);
                alert('Logout fejlede. Prøv igen.');
            });
    };

    // 1) Hvis brugeren har en “currentGroupId,” kan vi vise “Vis Gruppemedlemmer.”
    const handleShowMembers = () => {
        if (!currentGroupId) {
            alert('Du har ikke valgt nogen gruppe endnu.');
            return;
        }
        navigation.navigate('GroupMembers', { groupId: currentGroupId });
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.header}>
                Gruppeindstillinger
            </Text>

            {userData && userData.groups && userData.groups.length > 0 ? (
                <>

                    <Text style={{ marginBottom: 10 }}>
                        Hvis du vil skifte eller tilføje en gruppe, kan du gøre det nedenfor.
                    </Text>
                </>
            ) : (
                <Text style={{ marginBottom: 10 }}>Du er ikke i nogen gruppe.</Text>
            )}

            {/* Knap til at vise nuværende gruppes medlemmer */}
            <Button
                mode="contained"
                onPress={handleShowMembers}
                style={{ marginVertical: 10 }}
            >
                Vis Gruppemedlemmer
            </Button>

            {/* Kort til at oprette ny gruppe */}
            <Card style={{ marginVertical: 10 }}>
                <Card.Title title="Opret ny gruppe" />
                <Card.Content>
                    <TextInput
                        label="Gruppenavn"
                        value={groupName}
                        onChangeText={setGroupName}
                        style={styles.input}
                    />
                    <Button mode="contained" onPress={handleCreateGroup} style={styles.button}>
                        Opret gruppe
                    </Button>
                </Card.Content>
            </Card>

            {/* Kort til at deltage i eksisterende gruppe */}
            <Card style={{ marginVertical: 10 }}>
                <Card.Title title="Deltag i eksisterende gruppe" />
                <Card.Content>
                    <TextInput
                        label="Gruppe ID"
                        value={joinGroupId}
                        onChangeText={setJoinGroupId}
                        style={styles.input}
                    />
                    <Button mode="contained" onPress={handleJoinGroup} style={styles.button}>
                        Deltag i gruppe
                    </Button>
                </Card.Content>
            </Card>

            <Button
                mode="contained"
                onPress={() => navigation.navigate('GroupList')}
                style={{ marginTop: 20 }}
            >
                Tilbage til gruppeliste
            </Button>

            {/* Logout-knap nederst */}
            <View style={{ marginTop: 40, alignItems: 'center' }}>
                <IconButton
                    icon="logout"
                    size={30}
                    onPress={handleLogout}
                    style={{ backgroundColor: '#f0f0f0', borderRadius: 20 }}
                />
                <Text style={{ marginTop: 5 }}>Log ud</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-start',
        backgroundColor: '#fafafa',
    },
    header: {
        marginBottom: 10,
    },
    groupItem: {
        marginLeft: 10,
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginVertical: 10,
    },
});
