import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlmodel import Field, SQLModel, create_engine, Session, select, JSON, Column
from contextlib import contextmanager
from enum import Enum

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./orders.db")
engine = create_engine(DATABASE_URL, echo=True) 

class OrderStatus(str, Enum):
    PLACED = "PLACED"
    CANCELLED = "CANCELLED"

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    status: OrderStatus = Field(default=OrderStatus.PLACED)
    total_items: int
    details: List[Dict[str, Any]] = Field(sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@contextmanager
def get_session():
    with Session(engine) as session:
        yield session

def create_order(details: List[Dict[str, Any]]) -> Order:
    total_items = sum(item.get("qty", 0) for item in details)
    with get_session() as session:
        order = Order(details=details, total_items=total_items)
        session.add(order)
        session.commit()
        session.refresh(order)
        return order

def get_orders() -> List[Order]:
    with get_session() as session:
        statement = select(Order).order_by(Order.created_at.desc())
        results = session.exec(statement)
        return results.all()

def get_order_by_id(order_id: int) -> Optional[Order]:
     with get_session() as session:
        return session.get(Order, order_id)

def cancel_order(order_id: int) -> Optional[Order]:
    with get_session() as session:
        order = session.get(Order, order_id)
        if order:
            order.status = OrderStatus.CANCELLED
            session.add(order)
            session.commit()
            session.refresh(order)
        return order
 