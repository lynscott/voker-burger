from typing import List
from pydantic import BaseModel, Field, validator
from langchain_core.tools import tool
from order_service import (
    create_order as service_create_order,
    cancel_order as service_cancel_order,
    get_orders as service_get_orders,
    Order,
    OrderStatus
)

MENU = ["burger", "fries", "drink"]
MAX_QTY = 20
MIN_QTY = 1

class OrderDetail(BaseModel):
    item: str = Field(..., description="The menu item being ordered (burger, fries, or drink).")
    qty: int = Field(..., description="The quantity of the item being ordered.")

    @validator('item')
    def item_must_be_in_menu(cls, v):
        if v not in MENU:
            raise ValueError(f"Invalid item. Must be one of {MENU}")
        return v

    @validator('qty')
    def quantity_must_be_valid(cls, v):
        if not (MIN_QTY <= v <= MAX_QTY):
            raise ValueError(f"Invalid quantity. Must be between {MIN_QTY} and {MAX_QTY}.")
        return v

class PlaceOrderInput(BaseModel):
    details: List[OrderDetail] = Field(..., description="A list of items and quantities for the order.")

class CancelOrderInput(BaseModel):
    order_id: int = Field(..., description="The ID of the order to cancel.")

@tool
def place_order_tool(input: PlaceOrderInput) -> str:
    """Places a new food order with the specified items and quantities. Use this tool for new orders."""
    try:
        details_list = [detail.model_dump() for detail in input.details]
        new_order = service_create_order(details=details_list)
        return f"Order placed successfully! Your order ID is {new_order.id}. Details: {new_order.details}. Total items: {new_order.total_items}."
    except ValueError as e:
        return f"Error placing order: {str(e)}"
    except Exception as e:
        print(f"Error in place_order_tool: {e}")
        return "Sorry, there was an unexpected error placing your order."

@tool
def cancel_order_tool(input: CancelOrderInput) -> str:
    """Cancels an existing food order using its order ID. Use this tool to cancel a previously placed order."""
    try:
        updated_order = service_cancel_order(order_id=input.order_id)
        if updated_order:
            return f"Order ID {input.order_id} has been successfully cancelled."
        else:
            return f"Could not find an active order with ID {input.order_id} to cancel. It might already be cancelled or the ID is incorrect."
    except Exception as e:
        print(f"Error in cancel_order_tool: {e}")
        return f"Sorry, there was an unexpected error cancelling order ID {input.order_id}."

@tool
def get_current_orders_tool() -> str:
    """Retrieves a summary of all current active (placed) orders and their total item counts. Use this when asked about current orders or totals."""
    try:
        orders = service_get_orders()
        active_orders = [o for o in orders if o.status == OrderStatus.PLACED]

        if not active_orders:
            return "There are currently no active orders."

        totals = {item: 0 for item in MENU}
        summary_lines = []
        for order in active_orders:
            summary_lines.append(f"  - Order ID {order.id}: {order.total_items} items ({order.details})")
            if order.details:
                for detail in order.details:
                    item = detail.get("item")
                    qty = detail.get("qty", 0)
                    if item in totals:
                        totals[item] += qty

        total_summary = ", ".join([f"{qty} {item}s" for item, qty in totals.items() if qty > 0])
        if not total_summary:
            total_summary = "No items in active orders."

        return (
            f"Current Active Orders ({len(active_orders)} total):\n"
            + "\n".join(summary_lines)
            + f"\n\nTotal Active Items: {total_summary}"
        )
    except Exception as e:
        print(f"Error in get_current_orders_tool: {e}")
        return "Sorry, there was an error retrieving the current order summary."

tools = [place_order_tool, cancel_order_tool, get_current_orders_tool] 