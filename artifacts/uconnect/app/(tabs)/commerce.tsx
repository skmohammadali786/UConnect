import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCommerce } from "@/context/CommerceContext";
import { useColors } from "@/hooks/useColors";

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

type Tab = "shop" | "cart" | "wishlist" | "orders";

export default function CommerceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("shop");
  const commerce = useCommerce();

  const checkout = async () => {
    const order = await commerce.placeOrder();
    if (order) {
      Alert.alert("Order placed", `${order.id} has been added to your order history.`);
      setTab("orders");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 110 }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Campus Store</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Cart, wishlist, and order history are saved to your account on this device.</Text>
      </View>

      <View style={styles.tabs}>
        {([
          ["shop", "Shop", "shopping-bag"],
          ["cart", `Cart (${commerce.cartCount})`, "shopping-cart"],
          ["wishlist", `Wishlist (${commerce.wishlist.length})`, "heart"],
          ["orders", `Orders (${commerce.orders.length})`, "clock"],
        ] as const).map(([key, label, icon]) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, { backgroundColor: tab === key ? colors.primary : colors.card, borderColor: tab === key ? colors.primary : colors.border }]}>
            <Feather name={icon as any} size={14} color={tab === key ? "#fff" : colors.primary} />
            <Text style={[styles.tabText, { color: tab === key ? "#fff" : colors.foreground }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "shop" && commerce.products.map((product) => (
        <View key={product.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={styles.emoji}>{product.imageEmoji}</Text>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{product.name}</Text>
            <Text style={[styles.cardText, { color: colors.mutedForeground }]}>{product.description}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(product.price)}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => commerce.addToCart(product)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Add to cart</Text></Pressable>
              <Pressable onPress={() => commerce.toggleWishlist(product)} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}><Feather name="heart" size={18} color={commerce.isWishlisted(product.id) ? "#EF4444" : colors.mutedForeground} /></Pressable>
            </View>
          </View>
        </View>
      ))}

      {tab === "cart" && <View style={styles.section}>{commerce.cart.length ? commerce.cart.map((item) => <View key={item.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={styles.rowEmoji}>{item.imageEmoji}</Text><View style={styles.rowBody}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.cardText, { color: colors.mutedForeground }]}>{formatPrice(item.price)} × {item.quantity}</Text></View><View style={styles.qty}><Pressable onPress={() => commerce.updateQuantity(item.id, item.quantity - 1)}><Feather name="minus-circle" size={22} color={colors.primary} /></Pressable><Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text><Pressable onPress={() => commerce.updateQuantity(item.id, item.quantity + 1)}><Feather name="plus-circle" size={22} color={colors.primary} /></Pressable></View></View>) : <Empty title="Your cart is empty" colors={colors} />} {commerce.cart.length ? <Pressable onPress={checkout} style={[styles.checkout, { backgroundColor: colors.primary }]}><Text style={styles.checkoutText}>Place order • {formatPrice(commerce.cartTotal)}</Text></Pressable> : null}</View>}

      {tab === "wishlist" && <View style={styles.section}>{commerce.wishlist.length ? commerce.wishlist.map((item) => <View key={item.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={styles.rowEmoji}>{item.imageEmoji}</Text><View style={styles.rowBody}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.cardText, { color: colors.mutedForeground }]}>{formatPrice(item.price)}</Text></View><Pressable onPress={() => commerce.addToCart(item)} style={[styles.smallBtn, { backgroundColor: colors.primary }]}><Text style={styles.primaryText}>Cart</Text></Pressable></View>) : <Empty title="No wishlist items yet" colors={colors} />}</View>}

      {tab === "orders" && <View style={styles.section}>{commerce.orders.length ? commerce.orders.map((order) => <View key={order.id} style={[styles.order, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={styles.orderHead}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{order.id}</Text><Text style={[styles.status, { color: colors.primary, backgroundColor: colors.primary + "18" }]}>{order.status}</Text></View><Text style={[styles.cardText, { color: colors.mutedForeground }]}>{new Date(order.createdAt).toLocaleString()} • {order.items.length} item types</Text><Text style={[styles.price, { color: colors.primary }]}>{formatPrice(order.total)}</Text></View>) : <Empty title="Order history will appear here" colors={colors} />}</View>}
    </ScrollView>
  );
}

function Empty({ title, colors }: { title: string; colors: any }) { return <View style={styles.empty}><Feather name="inbox" size={34} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{title}</Text></View>; }

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 }, title: { fontFamily: "Inter_700Bold", fontSize: 28 }, subtitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, marginTop: 4 }, tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16 }, tab: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, tabText: { fontFamily: "Inter_600SemiBold", fontSize: 12 }, card: { marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: "row", gap: 14, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 }, emoji: { fontSize: 42 }, cardBody: { flex: 1, gap: 6 }, cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16 }, cardText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 }, price: { fontFamily: "Inter_700Bold", fontSize: 15 }, actions: { flexDirection: "row", gap: 10, marginTop: 4 }, primaryBtn: { flex: 1, borderRadius: 12, alignItems: "center", paddingVertical: 10 }, primaryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 }, iconBtn: { width: 42, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1 }, section: { paddingHorizontal: 16, gap: 10 }, row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 16, padding: 12 }, rowEmoji: { fontSize: 28 }, rowBody: { flex: 1 }, rowTitle: { fontFamily: "Inter_700Bold", fontSize: 14 }, qty: { flexDirection: "row", alignItems: "center", gap: 8 }, qtyText: { fontFamily: "Inter_700Bold", minWidth: 18, textAlign: "center" }, checkout: { borderRadius: 14, alignItems: "center", paddingVertical: 14, marginTop: 6 }, checkoutText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 }, smallBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 }, order: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }, orderHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, status: { fontFamily: "Inter_700Bold", fontSize: 11, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }, empty: { alignItems: "center", padding: 36, gap: 10 }, emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
