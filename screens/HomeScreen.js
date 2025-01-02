import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
// 1) Importer Calendar fra big-calendar
import { Calendar } from 'react-native-big-calendar';
import { FAB, IconButton, Button } from 'react-native-paper';
import { formatDate, formatTime } from '../utils/dateUtils';
import { useIsFocused } from '@react-navigation/native';

export default function HomeScreen({ navigation, route }) {
    const { groupId } = route.params || {};
    const isFocused = useIsFocused();

    // Her holder vi dine events i array-form: 
    //   [ {title, start, end, color}, ... ]
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Hvilken “view mode” (dag/uge/måned) vil vi se?
    const [mode, setMode] = useState('week');
    // Mulige værdier: 'day' | 'week' | 'month'

    useEffect(() => {
        // Tjek om brugeren er logget ind
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigation.replace('Login');
            }
        });
        return unsubscribe;
    }, []);

    // 2) Hent events, når skærmen fokuseres eller groupId ændres
    useEffect(() => {
        if (!isFocused) return;
        if (!groupId) {
            setEvents([]);
            setLoading(false);
            return;
        }
        fetchEvents();
    }, [isFocused, groupId]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            // For nu, henter vi “alle events” i den valgte gruppe, ingen “dato range”
            // Du kan også lave “date range” queries, hvis du vil begrænse data.
            const q = query(
                collection(db, 'events'),
                where('groupIds', 'array-contains', groupId)
            );
            const querySnapshot = await getDocs(q);
            const fetchedEvents = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Tjek for startTime/endTime
                if (data.startTime && data.endTime) {
                    fetchedEvents.push({
                        id: docSnap.id,
                        title: data.title || 'Uden titel',
                        start: new Date(data.startTime),
                        end: new Date(data.endTime),
                        color: data.userColor || '#000',
                        // Gem evt. mere her, fx userId: data.userId
                    });
                }
            });
            setEvents(fetchedEvents);
        } catch (error) {
            console.log('Error fetching events:', error);
        }
        setLoading(false);
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

    if (!groupId) {
        // Ingen gruppe valgt
        return (
            <View style={styles.center}>
                <Text>Vælg venligst en gruppe i GroupList først.</Text>
                <TouchableOpacity onPress={() => navigation.navigate('GroupList')}>
                    <Text style={{ color: 'blue', marginTop: 10 }}>Tilbage til Gruppeliste</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // 3) onPressEvent -> Gå til EventDetails
    const onPressEvent = (event) => {
        // event kan have en .id, hvis du vil navigere
        // Men vi gemte docSnap.id i feltet 'id' ovenfor
        if (event.id) {
            navigation.navigate('EventDetails', { eventId: event.id });
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {/* LILLE VÆRKTØJSLINJE TIL AT SKIFTE MELLEM DAG/UGE/MÅNED */}
            <View style={styles.toolbar}>
                <Button mode={mode === 'day' ? 'contained' : 'outlined'} onPress={() => setMode('day')}>
                    Dag
                </Button>
                <Button mode={mode === 'week' ? 'contained' : 'outlined'} onPress={() => setMode('week')}>
                    Uge
                </Button>
                <Button mode={mode === 'month' ? 'contained' : 'outlined'} onPress={() => setMode('month')}>
                    Måned
                </Button>
            </View>

            {/* 4) “BigCalendar” selv */}
            <Calendar
                events={events}
                mode={mode}              // day | week | month
                // Vil du vise start på “idag” -> date={new Date()}
                // date={new Date()}
                height={700}
                overlapOffset={100}
                onPressEvent={onPressEvent}
            />

            {/* BUND-KNAPPER (LOGOUT / COG / ADD EVENT) */}
            <View style={[styles.row, { position: 'absolute', bottom: 10, left: 10 }]}>
                <IconButton
                    icon="logout"
                    size={30}
                    onPress={handleLogout}
                    style={{ backgroundColor: 'white', borderRadius: 20 }}
                />
                <IconButton
                    icon="cog"
                    size={30}
                    onPress={() => navigation.navigate('Groups')}
                    style={{ backgroundColor: 'white', borderRadius: 20, marginLeft: 10 }}
                />
            </View>

            <FAB
                style={{ position: 'absolute', margin: 16, right: 0, bottom: 60 }}
                icon="plus"
                onPress={() => navigation.navigate('AddEvent', { groupId })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 8,
    },
});
