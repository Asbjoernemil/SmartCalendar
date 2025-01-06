import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, IconButton, Card } from 'react-native-paper';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

/**
 * GroupsScreen:
 *  - User kan oprette en ny gruppe - med navn.
 *  - User kan join eksisterende gruppe med groupId.
 *  - Viser "vis gruppemedlemmer" for aktuelle gruppe.
 *  - Mulighed for logout.
 */
export default function GroupsScreen({ navigation }) {
    // currentGroupId: den gruppe, User allerede er en del af
    const [currentGroupId, setCurrentGroupId] = useState(null);
    // Felter til at oprette / join grupper
    const [groupName, setGroupName] = useState('');
    const [joinGroupId, setJoinGroupId] = useState('');
    // userData: data om User (arrayet `groups`)
    const [userData, setUserData] = useState(null);

    /**
     * useEffect: Henter User data (f.eks. userDoc) ved første render.
     *  - Hvis ingen bruger -> login
     *  - Ellers sæt currentGroupId, hvis brugeren har mindst én gruppe
     */
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

                // Er der en "current" group? tager første gruppe i arrayet som "current".
                setCurrentGroupId(data.groups && data.groups.length > 0 ? data.groups[0] : null);
            } else {
                setUserData({});
            }
        };
        fetchUserData();
    }, []);

    /**
     * handleCreateGroup:
     *  - Opretter et nyt document i 'groups' collection med name, createdBy.
     *  - Tilføjer groupId til User 'groups' array i userDoc.
     */
    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert('Indtast et gruppenavn');
            return;
        }
        const user = auth.currentUser;

        // 1) Opret nyt doc i 'groups'
        const groupRef = await addDoc(collection(db, 'groups'), {
            name: groupName,
            createdBy: user.uid,
        });

        // 2) Tilføj groupRef.id til userDoc's "groups" array
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

    /**
     * handleJoinGroup:
     *  - join gruppe, hvis User kender groupId.
     *  - Tjekker om gruppe-doc eksisterer, og tilføjer derefter ID'et til userDoc.
     */
    const handleJoinGroup = async () => {
        if (!joinGroupId.trim()) {
            alert('Indtast et gruppe-ID for at deltage');
            return;
        }

        // Tjek, om groupDoc eksisterer
        const groupDocRef = doc(db, 'groups', joinGroupId);
        const groupSnap = await getDoc(groupDocRef);
        if (!groupSnap.exists()) {
            alert('Gruppe ikke fundet. Tjek gruppe-ID');
            return;
        }

        // Tilføj groupId til userDoc
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

    /**
     * handleLogout: Logger User ud af Firebase Auth og sender til Login.
     */
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

    /**
     * handleShowMembers:
     *  - Hvis der er en currentGroupId, gå til GroupMembersScreen for at se gruppemedlemmer.
     */
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

            {/* Viser feedback alt efter om User har grupper i forvejen eller ej */}
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

            {/* Card til at oprette ny gruppe */}
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

            {/* Card til at deltage i eksisterende gruppe */}
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

            {/* Knap til at vende tilbage til oversigten GroupList */}
            <Button
                mode="contained"
                onPress={() => navigation.navigate('GroupList')}
                style={{ marginTop: 20 }}
            >
                Tilbage til gruppeliste
            </Button>

            {/* Logout-knap nederst med ikon */}
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

// Styles
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
