import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { db } from '../../services/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { List } from 'react-native-paper';

/**
 * GroupMembersScreen:
 *  - Viser en liste over alle medlemmer i specifik gruppe (groupId).
 *  - Finder brugere ved at søge i 'users' collection, hvor 'groups' array-contains groupId.
 */
export default function GroupMembersScreen({ route }) {
    // groupId hentes fra navigation.params
    const { groupId } = route.params || {};
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Henter medlemmer ved første load, hvis groupId er defineret.
    useEffect(() => {
        if (!groupId) {
            setLoading(false);
            return;
        }
        fetchMembers();
    }, [groupId]);

    /**
     * fetchMembers:
     *  - Laver en query på 'users', hvor 'groups' array-contains groupId.
     *  - Henter hver User, gemmer i 'members' state.
     */
    const fetchMembers = async () => {
        setLoading(true);

        // Søg i 'users', hvor 'groups' indeholder groupId
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('groups', 'array-contains', groupId));
        const snap = await getDocs(q);

        const loaded = [];
        snap.forEach((docSnap) => {
            const uData = docSnap.data();
            loaded.push({
                uid: docSnap.id,
                displayName: uData.displayName || uData.email || docSnap.id,
                color: uData.color || '#000',
            });
        });

        setMembers(loaded);
        setLoading(false);
    };

    // Hvis data er ved at blive hentet -> spinner/ActivityIndicator
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Hvis færdige med at loade, men listen er tom -> "Ingen medlemmer"
    if (!members.length) {
        return (
            <View style={styles.center}>
                <Text>Ingen medlemmer fundet.</Text>
            </View>
        );
    }

    // renderItem -> viser hvert medlem som en List.Item
    const renderItem = ({ item }) => {
        return (
            <List.Item
                title={item.displayName}
                left={() => <List.Icon icon="account" color={item.color} />}
            />
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Gruppemedlemmer</Text>
            <FlatList
                data={members}
                renderItem={renderItem}
                keyExtractor={(item) => item.uid}
            />
        </View>
    );
}

// Styles
const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff'
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10
    }
});
