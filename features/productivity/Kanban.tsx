import {KanbanCols} from "pages/productivity";
import {FC} from "react";
import {DragDropContext, Droppable, Draggable, DropResult} from "react-beautiful-dnd";
import {SetFunction} from "types";
import {PlusIcon} from "@heroicons/react/solid";
import {v4 as uuid} from "uuid";

const Kanban: FC<{cols: KanbanCols; setCols: SetFunction}> = ({cols, setCols}) => (
  <div className="w-full flex justify-evenly rounded-xl border">
    <DragDropContext onDragEnd={(result) => onDragEnd(result, cols, setCols)}>
      {Object.entries(cols).map(([colId, col]) => (
        <div key={col.name} className="w-full px-4 py-8">
          <div className="flex justify-between">
            <h2>{col.name}</h2>
            <PlusIcon className="h-4 w-4 cursor-pointer" onClick={() => addCard(cols, setCols, colId)} />
          </div>
          <Droppable key={colId} droppableId={colId}>
            {(provided, snapshot) => (
              <div
                className="rounded-xl border border-foreground-alt-300 bg-background-light p-6"
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  backgroundColor: snapshot.isDraggingOver
                    ? "rgb(var(--color-foreground-alt-400))"
                    : "rgb(var(--color-background-light))",
                }}
              >
                {col.items.map(
                  (item, index) =>
                    item &&
                    item.id && (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className="rounded-xl"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              userSelect: "none",
                              padding: 16,
                              margin: "0 0 8px 0",
                              minHeight: "50px",
                              backgroundColor: snapshot.isDragging
                                ? "rgb(var(--color-foreground-alt-300))"
                                : "rgb(var(--color-foreground-alt-400))",
                              color: "rgb(var(--color-foreground-alt-100))",
                              ...provided.draggableProps.style,
                            }}
                          >
                            <p
                              id={item.id}
                              contentEditable="true"
                              onChange={() => editCard(colId, item.id, cols, setCols)}
                              onBlur={() => editCard(colId, item.id, cols, setCols)}
                              className="cursor-text focus:outline-none whitespace-pre"
                            >
                              {item.content}
                            </p>
                            {/* <input
                              id={item.id}
                              className={`w-full bg-foreground-alt-400 rounded-xl break-normal text-foreground-alt-200 focus:outline-none`}
                              placeholder={item.content}
                              // onKeyUp={(event) => editCard(event, colId, item.id, cols, setCols)}
                              onSubmit={(text) => editCard(text, colId, item.id, cols, setCols)}
                            /> */}
                          </div>
                        )}
                      </Draggable>
                    )
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      ))}
    </DragDropContext>
  </div>
);

// this function is done and works well, no further work needed right now
const onDragEnd = (result: DropResult, cols: KanbanCols, setCols: SetFunction) => {
  if (!result.destination) return;
  const {source, destination} = result;
  if (source.droppableId !== destination.droppableId) {
    const sourceCol = cols[source.droppableId];
    const destCol = cols[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = [...destCol.items];
    const [removed] = sourceItems.splice(destination.index, 1);
    destItems.splice(destination.index, 0, removed);
    setCols({
      ...cols,
      [source.droppableId]: {
        ...sourceCol,
        items: sourceItems,
      },
      [destination.droppableId]: {
        ...destCol,
        items: destItems,
      },
    });
  } else {
    const col = cols[source.droppableId];
    const copiedItems = [...col.items];
    const [removed] = copiedItems.splice(source.index, 1);
    copiedItems.splice(destination.index, 0, removed);
    setCols({
      ...cols,
      [source.droppableId]: {
        ...col,
        items: copiedItems,
      },
    });
  }
};

const addCard = (cols: KanbanCols, setCols: SetFunction, id: string) => {
  const col = cols[id];
  const copiedItems = [...col.items];
  setCols({
    ...cols,
    [id]: {
      ...col,
      items: [...copiedItems, {id: uuid(), content: "New Task."}],
    },
  });
};

// WIP
const editCard = (colId: string, itemId: string, cols: KanbanCols, setCols: SetFunction) => {
  const text = document.getElementById(itemId)?.innerText;
  const col = cols[colId];
  const copiedItems = col ? [...col.items] : [];
  for (let n = 0; n < copiedItems.length; n++) if (copiedItems[n].id === itemId) copiedItems[n].content = text || "";
  // console.log(thisTask);
  // if (text && thisTask) {
  //   const updatedTask: item = {...thisTask, content: text};
  //   copiedItems.splice(0, 0, updatedTask);
  // }

  setCols({
    ...cols,
    [colId]: {
      ...col,
      items: copiedItems,
    },
  });
};

export default Kanban;
