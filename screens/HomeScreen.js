import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { Agenda } from 'react-native-calendars';
import { FAB, IconButton } from 'react-native-paper';
import { formatDate, formatTime } from '../utils/dateUtils';

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

        const start = new Date(day.timestamp - 15 * 24 * 60 * 60 * 1000);
        const end = new Date(day.timestamp + 85 * 24 * 60 * 60 * 1000);

        // For at initiere Agendaens dage
        for (let i = -15; i < 85; i++) {
            const time = day.timestamp + i * 24 * 60 * 60 * 1000;
            const strTime = new Date(time).toISOString().split('T')[0];
            newItems[strTime] = [];
        }

        // VIGTIGT: Ændr her
        const q = query(
            collection(db, 'events'),
            where('date', '>=', start.toISOString().split('T')[0]),
            where('date', '<=', end.toISOString().split('T')[0]),
            // I stedet for where('groupId', '==', groupId)
            where('groupIds', 'array-contains', groupId)
        );

        try {
            const querySnapshot = await getDocs(q);
            console.log('Got querySnapshot with', querySnapshot.size, 'events');
            querySnapshot.forEach((docSnap) => {
                const event = docSnap.data();
                const strTime = event.date;
                if (!newItems[strTime]) {
                    newItems[strTime] = [];
                }
                newItems[strTime].push({
                    id: docSnap.id,
                    name: event.title,
                    height: 50,
                    date: event.date,
                    userId: event.userId,
                    userColor: event.userColor || '#000',
                    startTime: event.startTime,
                    endTime: event.endTime,
                });
            });
            console.log('newItems:', newItems);
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
                    const startTime = item.startTime ? new Date(item.startTime) : null;
                    const endTime = item.endTime ? new Date(item.endTime) : null;
                    const startString = startTime ? formatTime(startTime) : '';
                    const endString = endTime ? formatTime(endTime) : '';

                    return (
                        <TouchableOpacity onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}>
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

            {/* Placer IconButtons i et absolut positioneret view i bunden, uden baggrund */}
            <View style={{ position: 'absolute', bottom: 10, left: 10, flexDirection: 'row' }}>

                <IconButton
                    icon="cog"
                    size={30}
                    onPress={() => navigation.navigate('Groups')}
                    style={{ backgroundColor: 'white', borderRadius: 20, marginLeft: 10 }}
                />
                <IconButton
                    icon="chat"   // <--- Dit nye chat ikon
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
