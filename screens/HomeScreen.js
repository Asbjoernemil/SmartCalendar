import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Agenda } from 'react-native-calendars';
import { FAB, IconButton } from 'react-native-paper';
import { formatDate, formatTime } from '../utils/dateUtils';
import { doesEventOccurOnDate } from '../utils/recurrenceUtils';
import { useIsFocused } from '@react-navigation/native';

export default function HomeScreen({ navigation, route }) {
    // State til Agenda-items
    const [items, setItems] = useState({});

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { groupId } = route.params || {};


    const isFocused = useIsFocused();

    // Kigger på om brugeren er logget ind
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigation.replace('Login');
            }
        });
        return unsubscribe;
    }, []);

    /**
     * loadItems: Henter events fra Firestore for en given gruppe
     * og placerer dem i "items" i det format, Agenda vil have.
     */
    const loadItems = async (day) => {
        if (!groupId) {
            setItems({});
            return;
        }

        //tomt objekt, gemmer events pr. dato
        const newItems = {};

        // Agenda beder om events for en hel måned
        // dækker -15 dage før -> +85 dage efter day.timestamp
        for (let i = -15; i < 85; i++) {
            const time = day.timestamp + i * 24 * 60 * 60 * 1000;
            const strTime = new Date(time).toISOString().split('T')[0];
            newItems[strTime] = [];
        }

        try {
            // Hent ALLE events for groupId
            const ref = collection(db, 'events');
            const q = query(ref, where('groupIds', 'array-contains', groupId));
            const querySnapshot = await getDocs(q);

            // Gennemgå hvert event
            querySnapshot.forEach((docSnap) => {
                const event = docSnap.data();
                const eventId = docSnap.id;

                //For hver dato i newItems => check doesEventOccurOnDate
                Object.keys(newItems).forEach((dateKey) => {
                    if (doesEventOccurOnDate(event, dateKey)) {
                        newItems[dateKey].push({
                            id: eventId,
                            name: event.title,
                            date: dateKey,
                            userColor: event.userColor || '#000',
                            startTime: event.startTime,
                            endTime: event.endTime,
                        });
                    }
                });
            });

            // **Sorter**
            Object.keys(newItems).forEach((dateKey) => {
                newItems[dateKey].sort((a, b) => {
                    // a.startTime og b.startTime strings => konvert til Date
                    const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
                    const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
                    return aTime - bTime;
                });
            });

            setItems(newItems);
        } catch (e) {
            console.log('Error fetching events:', e);
            setItems({});
        }
    };

    // Genindlæs items, når vi kommer tilbage til HomeScreen
    useEffect(() => {
        if (isFocused && groupId) {
            const dayObj = {
                timestamp: new Date(selectedDate).getTime(),
                dateString: selectedDate,
            };
            loadItems(dayObj);
        }
    }, [isFocused, groupId]);

    // Hvis ingen gruppe er valgt
    if (!groupId) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Vælg venligst en gruppe i GroupList først.</Text>
                <TouchableOpacity onPress={() => navigation.navigate('GroupList')}>
                    <Text style={{ color: 'blue', marginTop: 10 }}>Tilbage til Gruppeliste</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <Agenda
                items={items}
                loadItemsForMonth={loadItems}
                selected={selectedDate}
                pastScrollRange={12}
                futureScrollRange={12}
                style={{ paddingBottom: 80 }}
                onDayPress={(day) => {
                    setSelectedDate(day.dateString);
                    navigation.navigate('DayEvents', { selectedDate: day.dateString, groupId });
                }}
                renderItem={(item, firstItemInDay) => {
                    // Konverter til Date for at kunne formatere
                    const startTime = item.startTime ? new Date(item.startTime) : null;
                    const endTime = item.endTime ? new Date(item.endTime) : null;
                    const startString = startTime ? formatTime(startTime) : '';
                    const endString = endTime ? formatTime(endTime) : '';

                    return (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                        >
                            <View
                                style={{
                                    backgroundColor: 'white',
                                    padding: 10,
                                    marginRight: 10,
                                    marginTop: 17,
                                    borderRadius: 5,
                                    borderLeftColor: item.userColor || '#000',
                                    borderLeftWidth: 5,
                                }}
                            >
                                <Text>{item.name}</Text>
                                <Text>{formatDate(item.date)}</Text>
                                {startString && endString && (
                                    <Text>{startString} - {endString}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                renderEmptyDate={() => (
                    <View style={{ padding: 10 }}>
                        <Text>Ingen aftaler denne dag.</Text>
                    </View>
                )}
            />

            {/* Bunden: Indstillinger + chat + opret-knap */}
            <View style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row' }}>
                <IconButton
                    icon="cog"
                    size={30}
                    onPress={() => navigation.navigate('Groups')}
                    style={{ backgroundColor: 'white', borderRadius: 20, marginLeft: 10 }}
                />
                <IconButton
                    icon="chat"
                    size={30}
                    onPress={() => navigation.navigate('GroupChat', { groupId })}
                    style={{ backgroundColor: 'white', borderRadius: 20, marginLeft: 10 }}
                />
            </View>

            <FAB
                style={{ position: 'absolute', margin: 16, right: 0, bottom: 60 }}
                icon="plus"
                onPress={() => navigation.navigate('AddEvent', { selectedDate, groupId })}
            />
        </View>
    );
}
