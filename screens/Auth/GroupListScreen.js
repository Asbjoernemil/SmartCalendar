import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, List } from 'react-native-paper';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';

/*
 * GroupListScreen:
 *  - Viser User groups og gør det muligt at vælge en gruppe til "Home". 
 *  - Hvis brugeren ikke har nogle grupper, kan man oprette / join via "GroupsScreen".
 */
export default function GroupListScreen({ navigation }) {
    // Lagre data om nuværende User, grupper og loading-tilstand.
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [groupsData, setGroupsData] = useState([]);

    // useIsFocused: Hook fra React Navigation, fortæller denne skærm er "aktiv" i stacken.
    // Bruges til at genindlæse data, når man vender tilbage.
    const isFocused = useIsFocused();

    /*
     * Henter User-doc fra Firestore (users/<uid>),
     * dernæst alle grupper, User er medlem af.
     */
    const fetchUserData = async () => {
        // 1) Tjek User er logget ind.
        const user = auth.currentUser;
        if (!user) {
            navigation.replace('Login');
            return;
        }

        // 2) Hent userDoc og grupper
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);

            // 3) Hvis User har liste af gruppe-IDs, hent selve group docs.
            if (data.groups && data.groups.length > 0) {
                const newGroupsData = [];
                for (const gId of data.groups) {
                    const gRef = doc(db, 'groups', gId);
                    const gSnap = await getDoc(gRef);

                    if (gSnap.exists()) {
                        const gData = gSnap.data();
                        // Hvis group doc har `name`-felt, brug; ellers fallback til groupId
                        newGroupsData.push({
                            id: gId,
                            name: gData.name || gId
                        });
                    } else {
                        // Hvis doc ikke findes, brug ID som fallback
                        newGroupsData.push({ id: gId, name: gId });
                    }
                }
                setGroupsData(newGroupsData);
            } else {
                // Hvis ingen grupper, sæt en tom liste
                setGroupsData([]);
            }
        } else {
            // Hvis ingen userDoc findes, opret en tom userData
            setUserData({ groups: [] });
            setGroupsData([]);
        }
        // Done loade
        setLoading(false);
    };

    /**
     * useEffect: Kører fetchUserData, når skærmen er i fokus, så listen altid er opdateret.
     */
    useEffect(() => {
        if (isFocused) {
            setLoading(true);
            fetchUserData();
        }
    }, [isFocused]);

    // Hvis stadig loading -> vis tekst
    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Indlæser...</Text>
            </View>
        );
    }

    // Forkortelse
    const groups = groupsData;

    // Hvis ingen grupper -> giv mulighed for at oprette / join
    if (groups.length === 0) {
        return (
            <View style={styles.container}>
                <Text variant="headlineSmall">Du er ikke medlem af nogen grupper endnu.</Text>
                <Text>Opret eller find en gruppe her:</Text>
                <Button mode="contained" onPress={() => navigation.navigate('Groups')}>
                    Gå til Gruppeindstillinger
                </Button>
            </View>
        );
    }

    /**
     * handleSelectGroup: Navigerer til "Home" med valgte groupId,
     * så User kan se kalenderen for den gruppe.
     */
    const handleSelectGroup = (groupId) => {
        navigation.navigate('Home', { groupId });
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall">Vælg en gruppe</Text>

            {/* Viser grupper i en FlatList */}
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <List.Item
                        title={`Gruppe: ${item.name}`}
                        // Viser ID som "beskrivelse"
                        description={`Gruppe-ID: ${item.id}`}
                        onPress={() => handleSelectGroup(item.id)}
                    />
                )}
            />

            {/* Mulighed for at administrere grupper (oprette, join, mv.) */}
            <Button mode="contained" onPress={() => navigation.navigate('Groups')}>
                Administrer grupper
            </Button>
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-start',
    },
});