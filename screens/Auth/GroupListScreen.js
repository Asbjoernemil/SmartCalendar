import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, List } from 'react-native-paper';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';

export default function GroupListScreen({ navigation }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [groupsData, setGroupsData] = useState([]);
    const isFocused = useIsFocused();

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
            if (data.groups && data.groups.length > 0) {
                const newGroupsData = [];
                for (const gId of data.groups) {
                    const gRef = doc(db, 'groups', gId);
                    const gSnap = await getDoc(gRef);
                    if (gSnap.exists()) {
                        const gData = gSnap.data();
                        // Brug gruppens navn, hvis den findes, ellers brug ID
                        newGroupsData.push({
                            id: gId,
                            name: gData.name || gId
                        });
                    } else {
                        newGroupsData.push({ id: gId, name: gId });
                    }
                }
                setGroupsData(newGroupsData);
            } else {
                setGroupsData([]);
            }
        } else {
            setUserData({ groups: [] });
            setGroupsData([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isFocused) {
            setLoading(true);
            fetchUserData();
        }
    }, [isFocused]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Indlæser...</Text>
            </View>
        );
    }

    const groups = groupsData;

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

    const handleSelectGroup = (groupId) => {
        navigation.navigate('Home', { groupId });
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall">Vælg en gruppe</Text>
            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <List.Item
                        title={`Gruppe: ${item.name}`}
                        // Her viser vi ID'et nedenunder navnet
                        description={`Gruppe-ID: ${item.id}`}
                        onPress={() => handleSelectGroup(item.id)}
                    />
                )}
            />
            <Button mode="contained" onPress={() => navigation.navigate('Groups')}>
                Administrer grupper
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
});
