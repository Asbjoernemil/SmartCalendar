import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Agenda } from 'react-native-calendars';
import { FAB, IconButton } from 'react-native-paper';
import { formatDate, formatTime } from '../utils/dateUtils';
import { doesEventOccurOnDate } from '../utils/recurrenceUtils'; // <--- Vores helper

export default function HomeScreen({ navigation, route }) {
    const [items, setItems] = useState({});
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { groupId } = route.params || {};

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigation.replace('Login');
            }
        });
        return unsubscribe;
    }, []);

    const loadItems = async (day) => {
        if (!groupId) {
            setItems({});
            return;
        }

        const newItems = {};

        // Byg en range på -15 og +85 dage ift. day.timestamp 
        // (Agenda-standard i dine for-loops)
        for (let i = -15; i < 85; i++) {
            const time = day.timestamp + i * 24 * 60 * 60 * 1000;
            const strTime = new Date(time).toISOString().split('T')[0];
            newItems[strTime] = [];
        }

        // Hent ALLE events for den pågældende group
        // (Hvis du har mange, kan du lave en date-bounded query i stedet)
        try {
            const ref = collection(db, 'events');
            const q = query(ref, where('groupIds', 'array-contains', groupId));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((docSnap) => {
                const event = docSnap.data();
                const eventId = docSnap.id;
                // For hvert date i newItems => check doesEventOccurOnDate
                Object.keys(newItems).forEach((dateKey) => {
                    if (doesEventOccurOnDate(event, dateKey)) {
                        // Ja -> tilføj til newItems[dateKey]
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

            setItems(newItems);
        } catch (e) {
            console.log('Error fetching events:', e);
            setItems({});
        }
    };

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
                    // item har {id, name, date, startTime, endTime, userColor}
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
                                {startString && endString ? <Text>{startString} - {endString}</Text> : null}
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

            {/* Bunden af skærmen (COG + CHAT + OPRET-knap) */}
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
