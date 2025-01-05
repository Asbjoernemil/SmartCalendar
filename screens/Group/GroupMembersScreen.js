import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { db } from '../../services/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { List } from 'react-native-paper';

export default function GroupMembersScreen({ route }) {
    const { groupId } = route.params || {};
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // A) Valg 1: Hent “members” array fra groupDoc
    // B) Valg 2: Søg i “users” collection, find dem der har groupId i groups
    // Her viser jeg Valg 2.

    useEffect(() => {
        if (!groupId) {
            setLoading(false);
            return;
        }
        fetchMembers();
    }, [groupId]);

    const fetchMembers = async () => {
        setLoading(true);

        // Søg i 'users', hvor 'groups' array-contains groupId
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

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!members.length) {
        return (
            <View style={styles.center}>
                <Text>Ingen medlemmer fundet.</Text>
            </View>
        );
    }

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
