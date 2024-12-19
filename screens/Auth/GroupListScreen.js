import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, List } from 'react-native-paper';
import { auth, db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';

export default function GroupListScreen({ navigation }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused(); // Henter info om skærmen er i fokus

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
        } else {
            setUserData({ groups: [] });
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isFocused) {
            setLoading(true);
            fetchUserData();
        }
    }, [isFocused]); // Hver gang skærmen kommer i fokus, hent brugerdata igen

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Indlæser...</Text>
            </View>
        );
    }

    const groups = userData.groups || [];

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
        // Naviger til Home med valgt groupId som parameter
        navigation.navigate('Home', { groupId });
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall">Vælg en gruppe</Text>
            <FlatList
                data={groups}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <List.Item
                        title={`Gruppe: ${item}`}
                        description="Tryk for at se kalender"
                        onPress={() => handleSelectGroup(item)}
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
